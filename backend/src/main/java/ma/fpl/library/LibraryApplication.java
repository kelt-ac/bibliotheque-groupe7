package ma.fpl.library;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
@SpringBootApplication
public class LibraryApplication {
  public static void main(String[] a) { SpringApplication.run(LibraryApplication.class, a); }
  @Bean CommandLineRunner seed(BookRepo books, ReaderRepo readers) {
    return x -> {
      if (books.count() > 0) return;
      String[][] d = {{"9780132350884","Clean Code","Robert C. Martin","Informatique"},
        {"9780596007126","Head First Design Patterns","Eric Freeman","Informatique"},
        {"9781617294945","Spring in Action","Craig Walls","Informatique"},
        {"9781491950296","Building Microservices","Sam Newman","Cloud"}};
      for (String[] r : d) { Book b = new Book(); b.isbn=r[0]; b.title=r[1]; b.author=r[2]; b.category=r[3]; b.totalCopies=b.availableCopies=2; books.save(b); }
      Reader r = new Reader(); r.name="Étudiant Test"; r.email="etudiant@fpl.ma"; r.studentId="E0001"; readers.save(r);
    };
  }
}
