# Aprova-se Clone — Plataforma de Organização de Estudos

## Pré-requisitos

- Java 21+
- Node 18+
- PostgreSQL 15+ instalado localmente

## Setup

### 1. Criar o banco de dados

```bash
psql -U postgres -c "CREATE DATABASE aprovase;"
```

### 2. Ajustar credenciais (se necessário)

Edite `backend/src/main/resources/application.properties` com seu usuário/senha do PostgreSQL.

### 3. Rodar o backend

```bash
cd backend
mvn spring-boot:run
```

O backend sobe em http://localhost:8080.  
Swagger UI: http://localhost:8080/swagger-ui.html

### 4. Rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend sobe em http://localhost:5173.

## Funcionalidades

| Tela | Descrição |
|------|-----------|
| Dashboard | Horas hoje/semana/mês, sequência, revisões do dia, gráfico 7 dias |
| Disciplinas | CRUD com cor e prioridade |
| Ciclo de Estudos | Cards sequenciais com cronômetro em tempo real |
| Planejamento Semanal | Grade visual segunda a domingo |
| Histórico | Tabela paginada com filtros por disciplina e data |
| Revisões | Lista de revisões espaçadas do dia e pendentes |
| Edital Verticalizado | Tópicos por disciplina com status (Não estudado/Estudado/Dominado) |
| Simulados | Registro de provas e histórico de resultados |
| Estatísticas | Gráficos de barras, pizza, mapa de calor |
| Preferências | Metas diárias/semanais e tema |

## Regras de negócio

- **Revisões espaçadas**: ao encerrar uma sessão, são criadas revisões para os dias +1, +3, +7, +14, +30.
- **Ciclo automático**: disciplinas ordenadas por prioridade (desc) e horas semanais (desc).
- **Streak**: dias consecutivos com pelo menos 1 sessão registrada.
- **Seed automático**: ao iniciar com banco vazio, insere 4 disciplinas exemplo e preferências padrão.

## Stack

- **Backend**: Spring Boot 3.2 + Java 21 + Spring Data JPA + PostgreSQL
- **Frontend**: React 18 + Vite + TailwindCSS + React Router + Recharts
