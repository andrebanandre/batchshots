export const runtime = 'edge';

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    const { locale = 'en' } = await request.json();

    // Check if the user is authenticated
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to make a purchase.' },
        { status: 401 }
      );
    }
    
    // Get user email from Clerk
    const email = user.emailAddresses[0]?.emailAddress;
    
    // Create or retrieve a Stripe customer
    const customerParams: Stripe.CustomerCreateParams = {
      email: email,
      metadata: {
        clerkId: userId
      }
    };
    
    // Look for existing customer with this Clerk ID
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });
    
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
      // Update metadata if needed
      if (customer.metadata.clerkId !== userId) {
        customer = await stripe.customers.update(customer.id, {
          metadata: { clerkId: userId }
        });
      }
    } else {
      // Create a new customer
      customer = await stripe.customers.create(customerParams);
    }

    console.log('locale', locale);

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      locale: locale,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: process.env.NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID!,
            unit_amount: 1999, // $19.99
            recurring: undefined // Fix type error by setting to undefined instead of null
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        clerkId: userId
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating checkout session' },
      { status: 500 }
    );
  }
} 