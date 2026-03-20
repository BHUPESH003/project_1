import client from './client';
import { unwrap } from './unwrap';

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
        return unwrap(response) as LocationSuggestion[];
    },
    
    getAddressFromCoords: async (lat: number, lng: number): Promise<AddressDetails> => {
        const response = await client.get(`/location/address?lat=${lat}&lng=${lng}`);
        return unwrap(response) as AddressDetails;
    }
};
