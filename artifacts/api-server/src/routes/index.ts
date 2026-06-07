import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flagsRouter from "./flags";
import paymentsRouter from "./payments";
import adminRouter from "./admin";
import gdprRouter from "./gdpr";

const router: IRouter = Router();

router.use(healthRouter);
router.use(flagsRouter);
router.use(paymentsRouter);
router.use(adminRouter);
router.use(gdprRouter);

export default router;
