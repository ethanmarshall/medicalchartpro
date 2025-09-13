import { useState } from "react";
import { type Patient } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface ProviderOrder {
  id: string;
  patientId: string;
  orderType: string;
  description: string;
  status: string;
  orderedBy: string;
  orderedAt: string;
}

interface ProviderOrdersProps {
  patient: Patient;
}

export function ProviderOrders({ patient }: ProviderOrdersProps) {
  const { data: providerOrders = [], isLoading } = useQuery<ProviderOrder[]>({
    queryKey: ['/api/patients', patient.id, 'provider-orders'],
  });

  const getOrderTypeColor = (orderType: string) => {
    switch (orderType) {
      case 'medication': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'diet': return 'bg-green-100 text-green-800 border-green-200';
      case 'activity': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'lab': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'procedure': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOrderTypeIcon = (orderType: string) => {
    switch (orderType) {
      case 'medication': return 'fa-pills';
      case 'diet': return 'fa-utensils';
      case 'activity': return 'fa-walking';
      case 'lab': return 'fa-vial';
      case 'procedure': return 'fa-stethoscope';
      default: return 'fa-clipboard';
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 p-6 bg-slate-50 rounded-lg border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Group orders by type
  const ordersByType = providerOrders.reduce((acc, order) => {
    if (!acc[order.orderType]) {
      acc[order.orderType] = [];
    }
    acc[order.orderType].push(order);
    return acc;
  }, {} as Record<string, ProviderOrder[]>);

  return (
    <div className="mt-6 p-6 bg-slate-50 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-medical-text-primary">
          <i className="fas fa-clipboard-check text-medical-primary mr-2"></i>Provider Orders
        </h4>
        <div className="text-sm text-medical-text-muted">
          {providerOrders.length} order{providerOrders.length !== 1 ? 's' : ''} active
        </div>
      </div>
      
      {providerOrders.length === 0 ? (
        <div className="text-center py-8 text-medical-text-muted">
          <i className="fas fa-clipboard-list text-2xl mb-2 opacity-50"></i>
          <p>No provider orders available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(ordersByType).map(([orderType, orders]) => (
            <div key={orderType} className="bg-white rounded-lg border border-medical-border p-4">
              <div className="flex items-center mb-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getOrderTypeColor(orderType)}`}>
                  <i className={`fas ${getOrderTypeIcon(orderType)} mr-1.5`}></i>
                  {orderType} Orders
                </span>
                <span className="ml-2 text-xs text-medical-text-muted">
                  ({orders.length} order{orders.length !== 1 ? 's' : ''})
                </span>
              </div>
              
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-start justify-between p-3 bg-gray-50 rounded border">
                    <div className="flex-1">
                      <p className="text-sm text-medical-text-primary font-medium">
                        {order.description}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-medical-text-muted">
                        <span className="flex items-center">
                          <i className="fas fa-user-md mr-1"></i>
                          Ordered by: {order.orderedBy}
                        </span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          <i className="fas fa-clock mr-1"></i>
                          {new Date(order.orderedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <i className={`fas ${
                          order.status === 'active' ? 'fa-check-circle' :
                          order.status === 'pending' ? 'fa-clock' :
                          order.status === 'completed' ? 'fa-check-double' :
                          'fa-question-circle'
                        } mr-1`}></i>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}