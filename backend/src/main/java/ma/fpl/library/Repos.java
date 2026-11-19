package ma.fpl.library;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
interface BookRepo extends JpaRepository<Book, Long> {
  @Query("select b from Book b where lower(b.title) like lower(concat('%',:q,'%')) or lower(b.author) like lower(concat('%',:q,'%')) or lower(b.category) like lower(concat('%',:q,'%')) or b.isbn like concat('%',:q,'%') order by b.title")
  List<Book> search(@Param("q") String q);
}
interface ReaderRepo extends JpaRepository<Reader, Long> {}
interface LoanRepo extends JpaRepository<Loan, Long> {
  List<Loan> findByReturnDateIsNullOrderByDueDate();
  long countByReaderIdAndReturnDateIsNull(Long readerId);
  List<Loan> findByReaderIdOrderByLoanDateDesc(Long readerId);
  List<Loan> findByReturnDateIsNullAndDueDateBeforeOrderByDueDate(LocalDate d);
}
interface AppUserRepo extends JpaRepository<AppUser, Long> {
  java.util.Optional<AppUser> findByUsername(String username);
}
