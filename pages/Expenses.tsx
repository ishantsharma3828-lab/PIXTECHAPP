
import React from 'react';
import ExpensesPanel from '../components/Expenses/ExpensesPanel';

const Expenses: React.FC = () => {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <ExpensesPanel />
    </div>
  );
};

export default Expenses;
