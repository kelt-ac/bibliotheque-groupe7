package ma.fpl.library;

import jakarta.persistence.*;

@Entity
@Table(name = "app_user")
public class AppUser {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(unique = true, nullable = false)
    public String username;

    @Column(nullable = false)
    public String passwordHash;

    @Column(nullable = false) 
    public String role;

    public Long readerId;
}