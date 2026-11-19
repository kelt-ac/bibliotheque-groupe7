package ma.fpl.library;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration @EnableWebSecurity
public class SecurityConfig {
  @Value("${app.jwt-secret}") String secret;
  private SecretKey key() { return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"); }

  @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
    var authorities = new JwtGrantedAuthoritiesConverter();
    authorities.setAuthoritiesClaimName("role");   // le claim "role" devient ROLE_LIBRARIAN / ROLE_READER
    authorities.setAuthorityPrefix("ROLE_");
    var conv = new JwtAuthenticationConverter();
    conv.setJwtGrantedAuthoritiesConverter(authorities);
    http.csrf(c -> c.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(a -> a
            .requestMatchers("/actuator/health/**", "/api/auth/login", "/api/auth/register").permitAll()
            .requestMatchers("/api/auth/password").hasAnyRole("READER", "LIBRARIAN")
            .requestMatchers(HttpMethod.GET, "/api/books").permitAll()          // catalogue public
            .requestMatchers("/api/loans/mine").hasAnyRole("READER", "LIBRARIAN")
            .anyRequest().hasRole("LIBRARIAN"))                                  // le reste : bibliothécaire
        .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(conv)));
    return http.build();
  }
  @Bean JwtDecoder jwtDecoder() { return NimbusJwtDecoder.withSecretKey(key()).build(); }
  @Bean JwtEncoder jwtEncoder() { return new NimbusJwtEncoder(new ImmutableSecret<>(key())); }
  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

  @Bean CommandLineRunner seedAdmin(AppUserRepo users, PasswordEncoder enc, @Value("${app.admin-password}") String pw) {
    return args -> {
      if (users.findByUsername("admin").isPresent()) return;
      try {
        AppUser u = new AppUser(); u.username = "admin"; u.passwordHash = enc.encode(pw); u.role = "LIBRARIAN";
        users.save(u);
      } catch (DataIntegrityViolationException e) { /* créé en même temps par l'autre réplica */ }
    };
  }
}
