import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function checkProStatus(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  try {
    // Use search API to find customer by metadata directly
    const searchResults = await stripe.customers.search({
      query: `metadata['clerkId']:'${userId}'`,
      limit: 1,
      expand: ['data.subscriptions'],
    });
    
    const customer = searchResults.data[0];
    
    if (!customer) return false;

    // Check for any successful payments for our Pro product
    const payments = await stripe.paymentIntents.list({
      customer: customer.id,
      limit: 100,
    });

    const successfulPayments = payments.data.filter(
      (payment) => payment.status === 'succeeded'
    );

    // If there are successful payments, return true
    if (successfulPayments.length > 0) {
      return true;
    }
    
    // If no successful payments, check for successfully paid invoices
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 100,
    });
    
    const paidInvoices = invoices.data.filter(
      (invoice) => invoice.status === 'paid'
    );
    
    // Return true if there are paid invoices, false otherwise
    return paidInvoices.length > 0;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false;
  }
} 