import jsonServer from "json-server";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";


const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(bodyParser.json({limit: "10mb"}));
server.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
server.use(middlewares);
server.use(cors({
  origin: ['https://frontend-develfood.vercel.app'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization'], 
}));

server.options('*', cors());

const SECRET_KEY = "auth_token";
const expiresIn = "1h";

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

server.get("/users", (req, res) => {
  const db = router.db;
  const users = db.get("users").value();
  res.json(users);
});

server.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.get("http://localhost:3001/users");
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
    console.error(error);
    res.status(500).json({ error: "Erro ao acessar os usuários!" });
  }
});

server.post("/restaurants", (req, res) => {
  const {
    cnpj,
    name,
    phone,
    email,
    password,
    foodTypes,
    nickname,
    zipcode,
    street,
    neighborhood,
    city,
    state,
    number,
  } = req.body;

  if (
    !cnpj ||
    !name ||
    !phone ||
    !email ||
    !password ||
    !foodTypes ||
    !nickname ||
    !zipcode ||
    !street ||
    !neighborhood ||
    !city ||
    !state ||
    !number
  ) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  try {
    const db = router.db;
    const restaurants = db.get("restaurants").value();

    const existingRestaurant = restaurants.find((r) => r.cnpj === cnpj);
    if (existingRestaurant) {
      return res.status(401).json({ error: "CNPJ já cadastrado!" });
    }

    const newRestaurant = {
      id: restaurants.length + 1,
      cnpj,
      name,
      phone,
      email,
      password,
      foodTypes,
      nickname,
      zipcode,
      street,
      neighborhood,
      city,
      state,
      number,
    };

    console.log("Novo restaurante a ser salvo:", newRestaurant);

    db.get("restaurants").push(newRestaurant).write();

    console.log("Restaurante salvo com sucesso!");

    res.status(200).json({ message: "Restaurante criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar restaurante:", error);
    res.status(500).json({ error: "Erro ao criar restaurante!" });
  }
});

server.get("/restaurants", (req, res) => {
  const db = router.db;
  const restaurants = db.get("restaurants").value();
  res.json(restaurants);
});

server.use((req, res, next) => {
  if (req.method === "GET") {
    return next();
  }

  if (
    (req.path === "/restaurants" && req.method === "POST") ||
    (req.path === "/products" && req.method === "POST")
  ) {
    return next();
  }

  if (req.path.startsWith("/products/") && req.method === "PUT") {
    return next();
  }

  if (req.path.startsWith("/products/") && req.method === "DELETE") {
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

server.post("/products", (req, res) => {
  const { name, image, description, price, foodTypes } = req.body;

  if (!name || !description || !price || !foodTypes) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  try {
    const db = router.db;
    const products = db.get("products").value();

    const newProduct = {
      id: products.length + 1,
      name,
      image: image || null,
      description,
      price,
      foodTypes,
    };

    db.get("products").push(newProduct).write();

    res.status(200).json({ message: "Produto criado com sucesso!", product: newProduct });
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ error: "Erro ao criar produto!" });
  }
});

server.get("/products", (req, res) => {
  const db = router.db;
  const products = db.get("products").value();
  res.json(products);
});

server.get("/products/:id", (req, res) => {
  const db = router.db;
  const productId = parseInt(req.params.id, 10);
  const product = db.get("products").find({ id: productId }).value();

  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: "Produto não encontrado" });
  }
});

server.put("/products/:id", (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const { name, image, description, price, foodTypes } = req.body;

  if (!name || !description || !price || !foodTypes) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  try {
    const db = router.db;
    const product = db.get("products").find({ id: productId }).value();

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const updatedProduct = {
      ...product,
      name,
      image: image || product.image,
      description,
      price,
      foodTypes,
    };

    db.get("products").find({ id: productId }).assign(updatedProduct).write();

    res.status(200).json({ message: "Produto atualizado com sucesso!", product: updatedProduct });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ error: "Erro ao atualizar produto!" });
  }
});

server.delete("/products/:id", (req, res) => {
  const productId = parseInt(req.params.id, 10);

  try {
    const db = router.db;
    const product = db.get("products").find({ id: productId }).value();

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    db.get("products").remove({ id: productId }).write();

    res.status(200).json({ message: "Produto excluído com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    res.status(500).json({ error: "Erro ao excluir produto!" });
  }
});

server.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});
