import React, { useState, useEffect } from 'react';

interface CongressDataDebugProps {
  congressData: any;
}

export const CongressDataDebug: React.FC<CongressDataDebugProps> = ({ congressData }) => {
  const [mockData, setMockData] = useState<any>(null);
  const [showMock, setShowMock] = useState(false);

  useEffect(() => {
    // Load mock data for demonstration
    fetch('/mock-congress-response.json')
      .then(res => res.json())
      .then(data => setMockData(data))
      .catch(err => console.log('Mock data not available:', err));
  }, []);

  const displayData = congressData || (showMock ? mockData : null);

  if (!displayData) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
        <p>Waiting for congress data...</p>
        {mockData && (
          <button
            onClick={() => setShowMock(true)}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Show Mock Data Example
          </button>
        )}
      </div>
    );
  }

  const extractPopoverFields = (member: any) => ({
    name: member.name,
    party: member.party,
    district: member.district,
    photo: member.depiction?.imageUrl,
    contact: {
      phone: member.contactInformation?.phoneNumber,
      email: member.contactInformation?.email,
      website: member.contactInformation?.websiteUrl,
      office: member.contactInformation?.officeAddress
    },
    committees: member.terms?.[0]?.current?.committees?.map((c: any) => c.name) || []
  });

  return (
    <div className="p-4 bg-gray-100 border border-gray-300 rounded max-h-96 overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">
          {congressData ? 'Congress.gov API Response:' : 'Mock Congress Data (Example):'}
        </h3>
        {!congressData && mockData && (
          <button
            onClick={() => setShowMock(!showMock)}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            {showMock ? 'Hide Mock' : 'Show Mock'}
          </button>
        )}
      </div>

      {displayData.members && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Available Fields for Popovers:</h4>
          {displayData.members.slice(0, 2).map((member: any, index: number) => (
            <div key={index} className="bg-white p-3 rounded mb-3 border">
              <h5 className="font-medium">{member.name} (District {member.district})</h5>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div><strong>Name:</strong> {extractPopoverFields(member).name}</div>
                <div><strong>Party:</strong> {extractPopoverFields(member).party}</div>
                <div><strong>Phone:</strong> {extractPopoverFields(member).contact.phone}</div>
                <div><strong>Email:</strong> {extractPopoverFields(member).contact.email}</div>
                <div><strong>Website:</strong> {extractPopoverFields(member).contact.website}</div>
                <div><strong>Committees:</strong> {extractPopoverFields(member).committees.join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer font-medium">Full JSON Response:</summary>
        <pre className="text-xs whitespace-pre-wrap mt-2 bg-white p-2 rounded border overflow-auto max-h-60">
          {JSON.stringify(displayData, null, 2)}
        </pre>
      </details>
    </div>
  );
};
