# Gestion de bibliothèque universitaire (Spring Boot + React + MySQL)

## Lancer
    docker compose up --build
Application : http://localhost:3000 — les données persistent dans le volume `mysqldata`.

## Développement local
- Base : `docker compose up db` (ajouter `ports: ["3306:3306"]` au service db)
- API : `cd backend && mvn spring-boot:run`  (http://localhost:8080/api/books)
- Front : `cd frontend && npm install && npm run dev`

## API
GET/POST /api/books · PUT/DELETE /api/books/{id} · GET/POST /api/readers
POST /api/loans {readerId, bookId} · POST /api/loans/{id}/return
GET /api/loans/active · GET /api/loans/overdue
Limite d'emprunts et durée : `app.max-loans` / `app.loan-days` (application.yml).
