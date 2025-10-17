'use client';

import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function DashboardHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <HelpCircle className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dashboard Guide</DialogTitle>
          <DialogDescription>
            Understanding your sales metrics and how they are calculated
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* Quick Start */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Quick Start</h3>
            <p className="text-gray-600">
              This dashboard shows real-time metrics from your HubSpot CRM. Use the filters at the
              top to select a sales manager and date range. All metrics update automatically.
            </p>
          </div>

          {/* Sales Funnel */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Sales Funnel</h3>
            <p className="text-gray-600 mb-2">
              Visualizes your sales process from contacts to closed deals:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>
                <strong>Contacts Created:</strong> Total contacts in period
              </li>
              <li>
                <strong>Deals Created:</strong> Opportunities (Qualified to Buy, High Interest)
              </li>
              <li>
                <strong>Closed Won:</strong> Paid customers
              </li>
            </ul>
          </div>

          {/* Key Metrics */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Key Metrics</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>
                <strong>Total Sales:</strong> Sum of all closed won deals (amount field)
              </li>
              <li>
                <strong>Conversion Rate:</strong> Contacts who became customers / Total contacts
                created
              </li>
              <li>
                <strong>Contacts Created:</strong> New contacts added in selected period
              </li>
            </ul>
          </div>

          {/* Call Metrics */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Call Performance</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>
                <strong>Total Calls:</strong> All logged calls in HubSpot
              </li>
              <li>
                <strong>5min Reached Rate:</strong> % of calls longer than 5 minutes (quality
                indicator)
              </li>
            </ul>
          </div>

          {/* Why Some Metrics Show 0 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Why Some Metrics Show 0</h3>
            <p className="text-gray-600 mb-2">Some metrics require HubSpot custom properties:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>
                <strong>Qualified Rate, Trial Rate:</strong> Needs{' '}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">qualified_status</code>,{' '}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">trial_status</code> in
                deals
              </li>
              <li>
                <strong>Payment Metrics:</strong> Needs{' '}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">upfront_payment</code>,{' '}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  number_of_installments
                </code>
              </li>
              <li>
                <strong>Contact Stage Breakdown:</strong> Needs{' '}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">contact_stage</code> to be
                set
              </li>
            </ul>
            <p className="text-gray-600 mt-2">
              Fill these properties in HubSpot, then run sync to see data.
            </p>
          </div>

          {/* Data Source */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Data Source</h3>
            <p className="text-gray-600">
              All data syncs from HubSpot CRM every 15 minutes. Last sync time is shown on the Sync
              page. Metrics are calculated in real-time from synced data.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
