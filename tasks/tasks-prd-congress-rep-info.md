## Relevant Files

- `src/types/maps.ts` - Contains the TypeScript type definitions that will need to be updated.
- `src/hooks/useMapData.ts` - This hook fetches and processes the data; it will need to be modified to include the new data.
- `src/components/TexasMap.tsx` - The main map component that renders the `InfoWindow`.
- `src/components/InfoWindow.test.tsx` - Unit tests for the `InfoWindow` component will need to be updated.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Update Data Structures and Types
  - [x] 1.1 Add a `contact` object to the `CongressionalDistrict` interface in `src/types/maps.ts` to hold the representative's contact details.
  - [x] 1.2 The `contact` object should include optional `phone` and `website` string properties.
- [x] 2.0 Enhance Data Fetching Logic
  - [x] 2.1 In `src/hooks/useMapData.ts`, update the data processing logic to extract the representative's full name, party, and contact information from the Congress.gov API response.
  - [x] 2.2 Ensure that the `party` and `contact` information are correctly mapped to the `CongressionalDistrict` object.
- [x] 3.0 Update InfoWindow UI Component
  - [x] 3.1 In `src/components/TexasMap.tsx`, modify the `renderDistrictInfoWindow` function to display the new information.
  - [x] 3.2 Add the representative's full name and party affiliation to the pop-up.
  - [x] 3.3 Display the contact information, including phone number and website, if available. Use icons for better scannability.
  - [x] 3.4 Ensure that if contact information is not available, nothing is displayed for that field (no placeholders).
- [x] 4.0 Update Unit Tests
  - [x] 4.1 In `src/components/InfoWindow.test.tsx`, update the tests for the `DistrictInfoWindow` to assert that the new information (full name, party, and contact details) is correctly rendered.
  - [x] 4.2 Add test cases to handle scenarios where contact information is partially or completely missing.
- [x] 5.0 Final Review and Cleanup
  - [x] 5.1 Manually test the feature to ensure the pop-up displays correctly for various districts.
  - [x] 5.2 Review the code for clarity, style consistency, and any unnecessary comments or logs. 