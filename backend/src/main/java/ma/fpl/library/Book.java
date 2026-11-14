package ma.fpl.library;
import jakarta.persistence.*;
@Entity
public class Book {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
  public String isbn, title, author, category;
  public int totalCopies, availableCopies;
}
