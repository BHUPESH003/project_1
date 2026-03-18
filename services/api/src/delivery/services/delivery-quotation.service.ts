/**
 * Delivery Quotation Service
 *
 * Handles fetching quotations from all active delivery partners
 * Caches quotations for performance
 */

import { Injectable, Logger } from '@nestjs/common';
import { DeliveryPartnerRepository } from '../repositories/delivery-partner.repository';
import { DeliveryAdapterRegistry } from '../adapters/delivery-adapter.registry';
import {
  DeliveryPartnerQuotation,
  AvailableDeliveryPartnersResponse,
} from '../dto/get-quotations.dto';

interface QuotationRequest {
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
}

@Injectable()
export class DeliveryQuotationService {
  private readonly logger = new Logger(DeliveryQuotationService.name);
  private readonly QUOTATION_VALIDITY_MINUTES = 5;
  private readonly QUOTATION_CACHE_MINUTES = 5;

  constructor(
    private readonly partnerRepository: DeliveryPartnerRepository,
    private readonly adapterRegistry: DeliveryAdapterRegistry,
  ) {}

  /**
   * Get available delivery partners with quotations
   * Returns multiple quotes so user can choose
   *
   * In multi-cart flows, sellerId can be passed to log seller context
   * (though the actual pickup location comes from the quotation request)
   */
  async getAvailableDeliveryPartners(
    request: QuotationRequest,
    orderId?: string,
    sellerId?: string,
  ): Promise<AvailableDeliveryPartnersResponse> {
    const logContext = sellerId ? ` (seller: ${sellerId})` : '';
    this.logger.log(
      `Fetching quotations for delivery${logContext}: ${JSON.stringify(request)}`,
    );

    // Check cache for recent quotations
    if (!orderId) {
      const cachedQuotations = await this.partnerRepository.getValidQuotations(
        request.pickupLatitude,
        request.pickupLongitude,
        request.dropLatitude,
        request.dropLongitude,
        this.QUOTATION_CACHE_MINUTES,
      );

      if (cachedQuotations.length > 0) {
        this.logger.log(
          `Using cached quotations${logContext}: ${cachedQuotations.length} partners`,
        );
        return this.formatResponse(cachedQuotations);
      }
    }

    // Get all active partners
    const partners = await this.partnerRepository.getActivePartners();
    if (partners.length === 0) {
      this.logger.warn('No active delivery partners configured');
      return {
        partners: [],
        cheapest: undefined,
        fastest: undefined,
        recommended: undefined,
      };
    }

    // Fetch quotations from all partners in parallel
    const quotationPromises = partners.map((partner) =>
      this.getQuotationFromPartner(partner, request, orderId),
    );

    const quotationResults = await Promise.allSettled(quotationPromises);

    const successfulQuotations = quotationResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((q) => q.isAvailable)
      .sort((a, b) => a.priority - b.priority); // Sort by priority

    this.logger.log(
      `Received ${successfulQuotations.length} valid quotations${logContext} from ${partners.length} partners`,
    );

    return this.formatResponse(successfulQuotations);
  }

  /**
   * Get quotation from a single partner
   * Calls partner API and saves the quotation
   */
  private async getQuotationFromPartner(
    partner: any,
    request: QuotationRequest,
    orderId?: string,
  ): Promise<DeliveryPartnerQuotation> {
    try {
      this.logger.debug(`Fetching quotation from ${partner.displayName}`);

      // Try to get adapter (some partners might not have adapters yet)
      let adapter;
      try {
        adapter = this.adapterRegistry.getAdapter(partner.providerName);
      } catch (e) {
        this.logger.warn(
          `No adapter for ${partner.providerName}, using API directly`,
        );
      }

      // Call adapter if available
      if (adapter) {
        try {
          const quote = await adapter.getQuote({
            pickup: {
              latitude: request.pickupLatitude,
              longitude: request.pickupLongitude,
              address: request.pickupAddress,
            },
            drop: {
              latitude: request.dropLatitude,
              longitude: request.dropLongitude,
              address: request.dropAddress,
            },
            orderId: orderId || 'adhoc',
          });

          // Save quotation to database
          const saved = await this.partnerRepository.saveQuotation({
            orderId,
            pickupLatitude: request.pickupLatitude,
            pickupLongitude: request.pickupLongitude,
            pickupAddress: request.pickupAddress,
            dropLatitude: request.dropLatitude,
            dropLongitude: request.dropLongitude,
            dropAddress: request.dropAddress,
            deliveryPartnerId: partner.id,
            quotedFeeRupees: quote.estimatedFee,
            estimatedMinutes: quote.estimatedDurationMinutes,
            providerQuoteId: quote.quoteId,
            expiresAt: new Date(
              Date.now() + this.QUOTATION_VALIDITY_MINUTES * 60 * 1000,
            ),
          });

          return this.formatPartnerQuotation(saved, partner);
        } catch (adapterError) {
          this.logger.error(
            `Failed to get quotation from adapter ${partner.providerName}`,
            adapterError,
          );
          throw adapterError;
        }
      } else {
        // Fallback: Use hardcoded pricing for now
        return this.generateMockQuotation(partner, request);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get quotation from ${partner.displayName}: ${errorMessage}`,
      );

      // Return unavailable quotation
      return {
        quotationId: `${partner.providerName}-${Date.now()}`,
        providerName: partner.displayName,
        providerId: partner.providerName,
        quotedFeeRupees: 0,
        estimatedMinutes: 0,
        isAvailable: false,
        unavailabilityReason: `Unable to get quote: ${errorMessage}`,
        priority: partner.priority,
        successRatePercent: partner.successRate?.toNumber() || 95,
        expiresAt: new Date(
          Date.now() + this.QUOTATION_VALIDITY_MINUTES * 60 * 1000,
        ),
      };
    }
  }

  /**
   * Format database quotation to response DTO
   */
  private formatPartnerQuotation(
    saved: any,
    partner: any,
  ): DeliveryPartnerQuotation {
    return new DeliveryPartnerQuotation({
      quotationId: saved.id,
      providerName: partner.displayName,
      providerId: partner.providerName,
      quotedFeeRupees: saved.quotedFeeRupees.toNumber(),
      estimatedMinutes: saved.estimatedMinutes,
      isAvailable: true,
      priority: partner.priority,
      successRatePercent: partner.successRate?.toNumber() || 95,
      expiresAt: saved.expiresAt,
    });
  }

  /**
   * Generate mock quotation for partners without adapters
   * TODO: Remove once all adapters are implemented
   */
  private generateMockQuotation(
    partner: any,
    request: QuotationRequest,
  ): DeliveryPartnerQuotation {
    // Simple distance estimation (Haversine formula)
    const distance = this.estimateDistance(
      request.pickupLatitude,
      request.pickupLongitude,
      request.dropLatitude,
      request.dropLongitude,
    );

    // Calculate fee based on distance
    const baseFee = partner.baseFeeRupees?.toNumber() || 50;
    const perKm = partner.perKmRupees?.toNumber() || 10;
    const minCharge = partner.minChargeRupees?.toNumber() || 50;

    const quotedFee = Math.max(baseFee + distance * perKm, minCharge);
    const estimatedMinutes = Math.max(10, Math.ceil(distance * 2)); // Rough estimate

    return new DeliveryPartnerQuotation({
      quotationId: `${partner.providerName}-mock-${Date.now()}`,
      providerName: partner.displayName,
      providerId: partner.providerName,
      quotedFeeRupees: Math.round(quotedFee),
      estimatedMinutes,
      isAvailable: true,
      priority: partner.priority,
      successRatePercent: partner.successRate?.toNumber() || 95,
      expiresAt: new Date(
        Date.now() + this.QUOTATION_VALIDITY_MINUTES * 60 * 1000,
      ),
    });
  }

  /**
   * Estimate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private estimateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format multiple quotations into response
   */
  private formatResponse(quotations: any[]): AvailableDeliveryPartnersResponse {
    const partners = quotations.map(
      (q) =>
        new DeliveryPartnerQuotation({
          quotationId: q.id,
          providerName: q.deliveryPartner.displayName,
          providerId: q.deliveryPartner.providerName,
          quotedFeeRupees: q.quotedFeeRupees.toNumber(),
          estimatedMinutes: q.estimatedMinutes,
          isAvailable: true,
          priority: q.deliveryPartner.priority,
          successRatePercent: q.deliveryPartner.successRate?.toNumber() || 95,
          expiresAt: q.expiresAt,
        }),
    );

    const cheapest = [...partners].sort(
      (a, b) => a.quotedFeeRupees - b.quotedFeeRupees,
    )[0];
    const fastest = [...partners].sort(
      (a, b) => a.estimatedMinutes - b.estimatedMinutes,
    )[0];

    // Recommended = best balance of price and speed (using simple scoring)
    const recommended = [...partners].sort((a, b) => {
      const scoreA = a.quotedFeeRupees / 100 + a.estimatedMinutes / 10;
      const scoreB = b.quotedFeeRupees / 100 + b.estimatedMinutes / 10;
      return scoreA - scoreB;
    })[0];

    return new AvailableDeliveryPartnersResponse({
      partners,
      cheapest,
      fastest,
      recommended,
    });
  }
}
