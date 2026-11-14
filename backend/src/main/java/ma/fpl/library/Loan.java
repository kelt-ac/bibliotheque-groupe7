package ma.fpl.library;
import jakarta.persistence.*;
import java.time.LocalDate;
@Entity
public class Loan {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
  @ManyToOne(fetch = FetchType.EAGER) public Book book;
  @ManyToOne(fetch = FetchType.EAGER) public Reader reader;
  public LocalDate loanDate, dueDate, returnDate;
}
