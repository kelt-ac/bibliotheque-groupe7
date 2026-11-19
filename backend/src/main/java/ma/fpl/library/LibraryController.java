package ma.fpl.library;
import java.time.LocalDate;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api")
public class LibraryController {
  private final BookRepo books; private final ReaderRepo readers; private final LoanRepo loans;
  @Value("${app.max-loans}") int maxLoans; @Value("${app.loan-days}") int loanDays;
  LibraryController(BookRepo b, ReaderRepo r, LoanRepo l) { books = b; readers = r; loans = l; }

  // ---- Catalogue ----
  @GetMapping("/books") List<Book> search(@RequestParam(defaultValue = "") String q) { return books.search(q); }
  @PostMapping("/books") Book add(@RequestBody Book b) { b.id = null; b.availableCopies = b.totalCopies; return books.save(b); }
  @PutMapping("/books/{id}") Book update(@PathVariable Long id, @RequestBody Book in) {
    Book b = books.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ouvrage introuvable"));
    int out = b.totalCopies - b.availableCopies;
    if (in.totalCopies < out) throw new ResponseStatusException(HttpStatus.CONFLICT, "Moins d'exemplaires que d'emprunts en cours");
    b.isbn = in.isbn; b.title = in.title; b.author = in.author; b.category = in.category;
    b.totalCopies = in.totalCopies; b.availableCopies = in.totalCopies - out;
    return books.save(b);
  }
  @DeleteMapping("/books/{id}") void delete(@PathVariable Long id) {
    try { books.deleteById(id); books.flush(); }
    catch (Exception e) { throw new ResponseStatusException(HttpStatus.CONFLICT, "Ouvrage lié à des emprunts : suppression impossible"); }
  }

  // ---- Lecteurs ----
  @GetMapping("/readers") List<Reader> readers() { return readers.findAll(); }
  @PostMapping("/readers") Reader addReader(@RequestBody Reader r) { r.id = null; return readers.save(r); }

  // ---- Emprunts ----
  @GetMapping("/loans/active") List<Loan> active() { return loans.findByReturnDateIsNullOrderByDueDate(); }
  @GetMapping("/loans/overdue") List<Loan> overdue() { return loans.findByReturnDateIsNullAndDueDateBeforeOrderByDueDate(LocalDate.now()); }

  @GetMapping("/loans/mine") List<Loan> mine(@AuthenticationPrincipal Jwt jwt) {   // emprunts du lecteur connecté
    Object rid = jwt.getClaim("readerId");
    return rid == null ? List.of() : loans.findByReaderIdOrderByLoanDateDesc(((Number) rid).longValue());
  }

  @PostMapping("/loans") @Transactional
  Loan borrow(@RequestBody Map<String, Long> req) {
    Reader r = readers.findById(req.get("readerId")).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lecteur introuvable"));
    Book b = books.findById(req.get("bookId")).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ouvrage introuvable"));
    if (loans.countByReaderIdAndReturnDateIsNull(r.id) >= maxLoans)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Limite de " + maxLoans + " emprunts atteinte pour ce lecteur");
    if (b.availableCopies <= 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Aucun exemplaire disponible");
    b.availableCopies--; books.save(b);
    Loan l = new Loan(); l.book = b; l.reader = r; l.loanDate = LocalDate.now(); l.dueDate = l.loanDate.plusDays(loanDays);
    return loans.save(l);
  }

  @PostMapping("/loans/{id}/return") @Transactional
  Loan giveBack(@PathVariable Long id) {
    Loan l = loans.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Emprunt introuvable"));
    if (l.returnDate != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Déjà retourné");
    l.returnDate = LocalDate.now(); l.book.availableCopies++; books.save(l.book);
    return loans.save(l);
  }
}
