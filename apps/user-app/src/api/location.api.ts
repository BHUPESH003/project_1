import client from './client';

export interface LocationSuggestion {
    description: string;
    placeId: string;
    mainText: string;
    secondaryText: string;
}

export interface AddressDetails {
    address: string;
    area: string;
    city?: string;
    state?: string;
    country?: string;
}

export const locationApi = {
    getAutocomplete: async (query: string): Promise<LocationSuggestion[]> => {
        const response = await client.get(`/location/autocomplete?query=${encodeURIComponent(query)}`);
        return response.data;
    },
    
    getAddressFromCoords: async (lat: number, lng: number): Promise<AddressDetails> => {
        const response = await client.get(`/location/address?lat=${lat}&lng=${lng}`);
        return response.data;
    }
};
