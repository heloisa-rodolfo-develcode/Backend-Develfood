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
    const response = await axios.get("http://localhost:3000/users");
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

  // Permite requisições PATCH para /orders/:id sem autenticação
  if (req.path.startsWith("/orders/") && req.method === "PATCH") {
    return next();
  }

  if (
    (req.path === "/restaurants" && req.method === "POST") ||
    (req.path === "/products" && req.method === "POST") ||
    (req.path === "/promotions" && req.method === "POST") // ou "/promotions"
  ) {
    return next();
  }

  if (
    (req.path.startsWith("/products/") && (req.method === "PUT" || req.method === "DELETE")) ||
    (req.path.startsWith("/promotions/") && (req.method === "PUT" || req.method === "DELETE"))
  ) {
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
  const { name, image, description, price, foodTypes, available } = req.body; 

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
      available, 
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
  const { name, image, description, price, foodTypes, available } = req.body; 

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
      available, 
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

server.post("/promotions", (req, res) => {
  const { name, image, percentage, start, end } = req.body;

  if (!name || !percentage || !start || !end) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  try {
    const db = router.db;
    const promotions = db.get("promotions").value();

    const newPromotion = {
      id: promotions.length + 1,
      name,
      image: image || null,
      percentage,
      start,
      end,
    };

    db.get("promotions").push(newPromotion).write();

    res.status(200).json({ message: "Promoção criada com sucesso!", promotion: newPromotion });
  } catch (error) {
    console.error("Erro ao criar promoção:", error);
    res.status(500).json({ error: "Erro ao criar promoção!" });
  }
});

server.get("/promotions", (req, res) => {
  const db = router.db;
  const promotions = db.get("promotions").value();
  res.json(promotions);
});

server.get("/promotions/:id", (req, res) => {
  const db = router.db;
  const promotionId = parseInt(req.params.id, 10);
  const promotion = db.get("promotions").find({ id: promotionId }).value();

  if (promotion) {
    res.json(promotion);
  } else {
    res.status(404).json({ error: "Promoção não encontrada" });
  }
});

server.put("/promotions/:id", (req, res) => {
  const promotionId = parseInt(req.params.id, 10);
  const { name, image, percentage, start, end } = req.body;

  if (!name || !percentage || !start || !end) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  try {
    const db = router.db;
    const promotion = db.get("promotions").find({ id: promotionId }).value();

    if (!promotion) {
      return res.status(404).json({ error: "Promoção não encontrada" });
    }

    const updatedPromotion = {
      ...promotion,
      name,
      image: image || promotion.image,
      percentage,
      start,
      end,
    };

    db.get("promotions").find({ id: promotionId }).assign(updatedPromotion).write();

    res.status(200).json({ message: "Promoção atualizada com sucesso!", promotion: updatedPromotion });
  } catch (error) {
    console.error("Erro ao atualizar promoção:", error);
    res.status(500).json({ error: "Erro ao atualizar promoção!" });
  }
});

server.delete("/promotions/:id", (req, res) => {
  const promotionId = parseInt(req.params.id, 10);

  try {
    const db = router.db;
    const promotion = db.get("promotions").find({ id: promotionId }).value();

    if (!promotion) {
      return res.status(404).json({ error: "Promoção não encontrada" });
    }

    db.get("promotions").remove({ id: promotionId }).write();

    res.status(200).json({ message: "Promoção excluída com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir promoção:", error);
    res.status(500).json({ error: "Erro ao excluir promoção!" });
  }
});

server.get("/orders", (req, res) => {
  const db = router.db;
  const orders = db.get("orders").value();
  res.json(orders);
});

const PORT = process.env.PORT || 3000; // Usa a porta do Vercel ou 3000 localmente

// Exporte uma função que inicia o servidor
export const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
};

// Inicie o servidor apenas se não estiver no ambiente do Vercel
if (process.env.NODE_ENV !== "production") {
  startServer();
}