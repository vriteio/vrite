import Stripe from "stripe";
import { config } from "#backend/lib/config";

const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;

export { stripe };
