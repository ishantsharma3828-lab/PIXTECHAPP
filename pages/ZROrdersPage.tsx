import React, { useState } from 'react';
import { DataTable } from '../components/ZRExpress/DataTable';
import { OrderDetails } from '../components/ZRExpress/OrderDetails';
import { CustomerDetails } from '../components/ZRExpress/CustomerDetails';
import '../components/ZRExpress/zr-styles.css';

const ZROrdersPage: React.FC = () => {
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);

  if (activeOrder) {
      return <div className="zr-module h-full w-full"><OrderDetails order={activeOrder} onBack={() => setActiveOrder(null)} /></div>;
  }

  if (activeCustomer) {
      return <div className="zr-module h-full w-full"><CustomerDetails customer={activeCustomer} onBack={() => setActiveCustomer(null)} /></div>;
  }

  return (
      <div className="zr-module h-full w-full">
      <DataTable
          moduleName="Orders"
          onRowClick={(item) => setActiveOrder(item)}
      />
      </div>
  );
};

export default ZROrdersPage;