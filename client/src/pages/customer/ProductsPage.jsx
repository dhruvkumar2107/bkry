import ProductBrowser from '../../components/ProductBrowser.jsx';
import CategoryNav from '../../components/CategoryNav.jsx';

export default function ProductsPage() {
  return (
    <div>
      <div className="mb-3"><CategoryNav /></div>
      <ProductBrowser title="All Products" subtitle="Fresh sweets, namkeen, bakery & veg snacks" />
    </div>
  );
}
