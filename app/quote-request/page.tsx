import type {Metadata} from 'next';
import QuoteRequestForm from './QuoteRequestForm';
export const metadata:Metadata={title:'Your insurance quote request',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function QuoteRequestPage(){return <QuoteRequestForm/>}
