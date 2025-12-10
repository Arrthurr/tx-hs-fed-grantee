import { getBill, clearCache } from './congress';

// Mock the fetch API
global.fetch = jest.fn();

describe('Congress API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  test('fetches bill data from Congress.gov API', async () => {
    const mockData = {
      bill: {
        number: 'HR 3076',
        congress: 117,
        type: 'HR',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockData,
    });

    const result = await getBill('HR-3076');

    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.congress.gov/v3/bill')
    );
  });

  test('includes API key in request URL', async () => {
    const mockData = { bill: {} };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockData,
    });

    await getBill('HR-3076');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('api_key=');
  });

  test('uses correct API endpoint', async () => {
    const mockData = { bill: {} };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockData,
    });

    await getBill('HR-3076');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('api.congress.gov/v3/bill');
    expect(callUrl).toContain('/117/');
    expect(callUrl).toContain('hr/3076');
  });

  test('returns bill data with expected structure', async () => {
    const mockData = {
      bill: {
        number: 'HR 3076',
        congress: 117,
        type: 'HR',
        title: 'Test Bill',
        introducedDate: '2021-09-29',
        status: 'Referred to Committee',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockData,
    });

    const result = await getBill('HR-3076');

    expect(result).toHaveProperty('bill');
    expect(result.bill).toHaveProperty('number');
    expect(result.bill).toHaveProperty('congress');
  });

  test('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    await expect(getBill('HR-3076')).rejects.toThrow('Network error');
  });

  test('handles invalid JSON response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(getBill('HR-3076')).rejects.toThrow('Invalid JSON');
  });

  test('handles network timeout gracefully', async () => {
    const timeoutError = new Error('Timeout');
    (global.fetch as jest.Mock).mockRejectedValueOnce(timeoutError);

    await expect(getBill('HR-3076')).rejects.toThrow('Timeout');
  });
});
