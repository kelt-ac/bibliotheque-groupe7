package ma.fpl.library;
import jakarta.persistence.*;
import java.time.LocalDate;
@Entity
@Table(indexes = { @Index(name = "idx_loan_active", columnList = "returnDate,dueDate"), @Index(name = "idx_loan_reader", columnList = "reader_id,returnDate") })
public class Loan {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
  @ManyToOne(fetch = FetchType.EAGER) public Book book;
  @ManyToOne(fetch = FetchType.EAGER) public Reader reader;
  public LocalDate loanDate, dueDate, returnDate;
}
