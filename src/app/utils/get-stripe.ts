import { Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe>;
const getStripe = (): Promise<Stripe> => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error("Stripe publishable key is not set in .env");
    }
    stripePromise = loadStripe(key).then(stripe => {
      if (!stripe) {
        throw new Error("Stripe failed to initialize. Check your publishable key.");
      }
      return stripe;
    });
  }
  return stripePromise;
};

export default getStripe;