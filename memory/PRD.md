# NEXUS OPS Dashboard - PRD

## Original Problem Statement
Recriar o aplicativo NEXUS OPS Dashboard - operational dashboard com tema Dark Hacker.

## User Choices
- Stack: React + FastAPI + MongoDB
- Auth: JWT custom (email + senha)
- AI: GPT-5.2 via Emergent LLM Key
- Tema: Dark Hacker (preto/cyan neon, JetBrains Mono)

## Implemented (Jan 2026)
- JWT Auth (login/register/me/logout) com admin auto-seeded
- 7 páginas: Visão Geral, Gestão de Clientes (CRUD + MRR + Health), Controle Financeiro (transações + receita/cliente), Code Hub (snippets CRUD), Interrogatório IA (chat GPT-5.2), Analisador de Sites (mock scores), Configurações (perfil + cor de acento)
- Modal de confirmação customizado para deletes (substitui window.confirm)
- Atividade automática logada para auditoria

## Backlog (P1)
- Kanban de Projetos
- Relatórios em PDF
- Upload de screenshots S3
- Tráfego analítica completa
- Histórico de decisões com timeline

## Backlog (P2)
- Real Lighthouse via Google PSI API
- Brute force lockout
- Password reset por email
