import { PageHeader } from '../components/UI';
import Benchmarks from '../components/Benchmarks';
import './collections.css';
import './business.css';

export default function Benchmark() {
  return <div className="collection-page">
    <PageHeader eyebrow="CONHECIMENTO" title="Benchmark · Rental rate (R$/m²)" description="Valores de referência de aluguel comercial por local, com simulação por área." />
    <Benchmarks />
  </div>;
}
