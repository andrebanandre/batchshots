import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function checkProStatus(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  try {
    // Find the customer associated with the Clerk ID by searching all customers
    const params: Stripe.CustomerListParams = {
      limit: 100, // Get a reasonable number of customers
      expand: ['data.subscriptions'],
    };
    
    const customers = await stripe.customers.list(params);
    
    // Filter customers by metadata manually
    const customer = customers.data.find(
      (cust) => cust.metadata?.clerkId === userId
    );
    
    if (!customer) return false;

    // Check for any successful payments for our Pro product
    const payments = await stripe.paymentIntents.list({
      customer: customer.id,
      limit: 100,
    });

    const successfulPayments = payments.data.filter(
      (payment) => payment.status === 'succeeded'
    );

    // Check if there are any successful payments
    return successfulPayments.length > 0;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false;
  }
} 