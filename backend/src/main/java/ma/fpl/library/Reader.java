package ma.fpl.library;
import jakarta.persistence.*;
@Entity
public class Reader {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
  public String name, email, studentId;
}
