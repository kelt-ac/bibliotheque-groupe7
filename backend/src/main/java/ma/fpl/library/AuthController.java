package ma.fpl.library;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/auth")
public class AuthController {
  record LoginReq(String username, String password) {}
  record PasswordReq(String currentPassword, String newPassword) {}
  record RegisterReq(String username, String password, String name, String email, String studentId) {}

  private final AppUserRepo users; private final ReaderRepo readers; private final PasswordEncoder enc; private final JwtEncoder jwt;
  AuthController(AppUserRepo u, ReaderRepo r, PasswordEncoder e, JwtEncoder j) { users = u; readers = r; enc = e; jwt = j; }

  @PostMapping("/login")
  Map<String, Object> login(@RequestBody LoginReq r) {
    AppUser u = users.findByUsername(r.username() == null ? "" : r.username().trim())
        .filter(x -> r.password() != null && enc.matches(r.password(), x.passwordHash))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identifiants incorrects"));
    return token(u);
  }

  @PostMapping("/register") @Transactional   // inscription libre : toujours le rôle READER
  Map<String, Object> register(@RequestBody RegisterReq r) {
    if (r.username() == null || r.username().trim().length() < 3)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom d'utilisateur : 3 caractères minimum");
    if (r.password() == null || r.password().length() < 8)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe : 8 caractères minimum");
    if (r.name() == null || r.name().isBlank())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom complet obligatoire");
    if (users.findByUsername(r.username().trim()).isPresent())
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce nom d'utilisateur existe déjà");
    Reader rd = new Reader(); rd.name = r.name(); rd.email = r.email(); rd.studentId = r.studentId();
    readers.save(rd);
    AppUser u = new AppUser(); u.username = r.username().trim(); u.passwordHash = enc.encode(r.password());
    u.role = "READER"; u.readerId = rd.id;
    users.save(u);
    return token(u);
  }

  @PostMapping("/password") @Transactional   // utilisateur connecté uniquement (voir SecurityConfig)
  Map<String, String> changePassword(@AuthenticationPrincipal Jwt j, @RequestBody PasswordReq r) {
    AppUser u = users.findByUsername(j.getSubject())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Compte introuvable"));
    // 400 (et non 401) pour une erreur de saisie : le front traite 401 comme une session expirée
    if (r.currentPassword() == null || !enc.matches(r.currentPassword(), u.passwordHash))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe actuel incorrect");
    if (r.newPassword() == null || r.newPassword().length() < 8)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nouveau mot de passe : 8 caractères minimum");
    if (r.newPassword().equals(r.currentPassword()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nouveau mot de passe doit être différent de l'ancien");
    u.passwordHash = enc.encode(r.newPassword());
    users.save(u);
    return Map.of("message", "Mot de passe modifié");
  }

  private Map<String, Object> token(AppUser u) {
    Instant now = Instant.now();
    var claims = JwtClaimsSet.builder().subject(u.username).issuedAt(now).expiresAt(now.plus(8, ChronoUnit.HOURS)).claim("role", u.role);
    if (u.readerId != null) claims.claim("readerId", u.readerId);
    String t = jwt.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build())).getTokenValue();
    return Map.of("token", t, "username", u.username, "role", u.role);
  }
}
