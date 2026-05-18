# Lureh Engine

**Motor de simulacion financiera temporal.**

No es un rastreador de gastos. Es un simulador que responde una pregunta:

> *"Que pasa con mis finanzas si tomo la decision X hoy?"*

Lureh proyecta tu situacion financiera en el tiempo: ingresos, gastos, deudas, tarjetas de credito, metas de ahorro y escenarios alternativos. Todo calculado con precision matematica, sin estimaciones vagas.

---

## Que puede hacer

- **Proyeccion temporal** — ve como evoluciona tu balance mes a mes
- **Amortizacion francesa** — calculo exacto de cuotas, intereses y saldo de prestamos
- **Tarjetas de credito colombianas** — interes por compra individual, compras a 1 cuota sin interes, cuotas con interes sobre saldo restante
- **Escenarios** — compara "que pasa si compro X" vs "que pasa si no"
- **Metas financieras** — cuanto necesitas ahorrar y si vas a tiempo
- **Simulacion de abonos extra** — cuanto te ahorras en intereses si abonas hoy
- **Modo oscuro** — porque las finanzas dan menos miedo en la oscuridad

## Stack tecnico

| Capa | Tecnologia |
|------|-----------|
| Engine | TypeScript puro (zero dependencies) |
| Server | Express + SQLite (better-sqlite3) |
| Web | React 18 + Vite + Tailwind CSS + Recharts |
| Monorepo | npm workspaces (3 paquetes) |

```
packages/
  engine/    # Motor de simulacion — logica pura, sin framework
  server/    # API REST + base de datos
  web/       # Dashboard interactivo
```

---

## Inicio rapido

### Requisitos

- [Node.js](https://nodejs.org/) 20+
- npm 9+

### Instalacion

```bash
git clone https://github.com/Lureh11/Lureh-Engine.git
cd Lureh-Engine
npm install
```

### Desarrollo

Necesitas dos terminales:

```bash
# Terminal 1 — Backend (API + Base de datos)
npm run dev:server

# Terminal 2 — Frontend (Dashboard)
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

### Produccion

```bash
npm run build
npm run start --workspace=@lureh/server
```

El servidor sirve la API y el frontend en [http://localhost:3001](http://localhost:3001).

---

## Docker

Si prefieres no instalar Node:

```bash
docker compose up -d
```

Abre [http://localhost:3001](http://localhost:3001). Tus datos persisten en un volumen de Docker.

Para reconstruir despues de un `git pull`:

```bash
docker compose up -d --build
```

---

## Estructura del proyecto

```
Lureh-Engine/
├── packages/
│   ├── engine/              # Motor de simulacion
│   │   ├── models/types.ts  # Tipos: Account, Debt, Event, etc.
│   │   ├── rules/           # Amortizacion, inflacion
│   │   └── simulation/      # Motor principal, recurrencias
│   ├── server/              # API REST
│   │   ├── db/              # SQLite schema + queries
│   │   └── routes/          # Endpoints por entidad
│   └── web/                 # Dashboard React
│       ├── components/      # UI reutilizable
│       ├── pages/           # Vistas principales
│       └── api/client.ts    # Cliente HTTP tipado
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Como funciona el motor

El engine es **TypeScript puro sin dependencias de framework**. Recibe un `SimulationInput` y devuelve un `SimulationResult`:

```typescript
import { simulate } from '@lureh/engine';

const result = simulate({
  accounts: [...],
  events: [...],
  debts: [...],
  goals: [...],
  scenarios: [...],
  config: {
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    inflationRate: 0.05,
    periodType: 'monthly',
  },
  activeScenarioIds: [],
});

// result.timeline  → balance por periodo
// result.summary   → totales, alertas, nivel de riesgo
```

### Modelo de tarjeta de credito

Lureh modela tarjetas de credito como funcionan en Colombia:

- **1 cuota** → pago completo el siguiente corte, cero interes
- **N cuotas** → capital / N por mes + interes sobre saldo restante de esa compra
- **Interes total** → suma de intereses individuales de cada compra
- Sin porcentaje de pago minimo arbitrario — el pago se calcula de las compras

---

## Licencia

[MIT](LICENSE)
