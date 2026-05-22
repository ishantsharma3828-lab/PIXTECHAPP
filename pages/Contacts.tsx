
import React from 'react';
import ContactsPanel from '../components/Contacts/ContactsPanel';

const Contacts: React.FC = () => {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <ContactsPanel />
    </div>
  );
};

export default Contacts;
