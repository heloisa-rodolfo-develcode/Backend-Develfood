import jsonServer from "json-server";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// 🔹 Definir a URL base da API dinamicamente
const API_URL = process.env.VITE_API_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

// 🔹 Configuração do CORS (Coloque antes de qualquer rota)
server.use(cors({
  origin: "https://frontend-develfood.vercel.app", // Seu frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204
}));

// 🔹 Middleware para pré-voo CORS (preflight)
server.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "https://frontend-develfood.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
});

server.use(bodyParser.json());
server.use(middlewares);

const SECRET_KEY = "auth_token";
const expiresIn = "1h";

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// 🔹 Ajustar o login para usar a API correta
server.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.get(`${API_URL}/users`);
    const users = response.data;

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: "Usuário ou senha incorretos!" });
    }

    const token = createToken({ email: user.email, id: user.id });
    res.json({ token });
  } catch (error) {
    console.error("Erro ao acessar os usuários:", error);
    res.status(500).json({ error: "Erro ao acessar os usuários!" });
  }
});

// 🔹 Middleware para proteger rotas que não são GET
server.use((req, res, next) => {
  if (req.method === "GET") {
    return next();
  }

  if (!req.headers.authorization) {
    return res.status(403).json({ error: "Token não fornecido" });
  }

  const token = req.headers.authorization.split(" ")[1];

  try {
    jwt.verify(token, SECRET_KEY);
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
