import { useSearchParams } from 'react-router-dom';
import ProductBrowser from '../../components/ProductBrowser.jsx';
import { EmptyState } from '../../components/ui.jsx';
import { SearchX } from 'lucide-react';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';

  if (!q) {
    return <EmptyState icon={SearchX} title="Search Chotulal Sweets" subtitle="Type a product name in the search bar above." />;
  }
  return <ProductBrowser title={`Results for "${q}"`} baseParams={{ q }} />;
}
