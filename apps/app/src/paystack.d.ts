// @paystack/inline-js ships no type declarations. Only the surface we use.
declare module "@paystack/inline-js" {
  export interface PaystackTransaction {
    reference: string
    status: string
    [key: string]: unknown
  }

  export interface PaystackCallbacks {
    onLoad?: (response: unknown) => void
    onSuccess?: (transaction: PaystackTransaction) => void
    onCancel?: () => void
    onError?: (error: { message?: string }) => void
  }

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): unknown
  }
}
