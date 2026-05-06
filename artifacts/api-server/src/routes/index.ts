import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import resolucoesRouter from "./resolucoes";
import usuariosRouter from "./usuarios";
import dashboardRouter from "./dashboard";
import relatoriosRouter from "./relatorios";
import categoriasRouter from "./categorias";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(resolucoesRouter);
router.use(usuariosRouter);
router.use(dashboardRouter);
router.use(relatoriosRouter);
router.use(categoriasRouter);

export default router;
