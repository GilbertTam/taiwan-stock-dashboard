from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
import json

class RevenueOptimizationViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('revenue-analyze')
        self.valid_config = {
            'E_cap': 100,
            'P_max_dis': 50,
            'P_max_ch': 50,
            'Min_bid': 1,
            'eff_ch': 0.95,
            'eff_dis': 0.95,
            'beta_bal': 0.5,
            'E_loss': 0.1,
            'SoC_min_pct': 0.0,
            'SoC_max_pct': 1.0,
            'SoC_init_pct': 0.5,
            'SoC_end_pct': 0.5,
            'Cycle_limit': 2,
            'Cost_cycle': 0,
            'T': 5,
            'dt': 0.5
        }
        self.valid_data = [
            {'Spot_Price': 10, 'Bal_Price': 5, 'Mask_Ch': 1, 'Mask_Dis': 1},
            {'Spot_Price': 8, 'Bal_Price': 4, 'Mask_Ch': 1, 'Mask_Dis': 1},
            {'Spot_Price': 12, 'Bal_Price': 6, 'Mask_Ch': 1, 'Mask_Dis': 1},
            {'Spot_Price': 15, 'Bal_Price': 7, 'Mask_Ch': 1, 'Mask_Dis': 1},
            {'Spot_Price': 9, 'Bal_Price': 4, 'Mask_Ch': 1, 'Mask_Dis': 1},
        ]

    def test_optimization_success(self):
        payload = {
            'config': self.valid_config,
            'data': self.valid_data
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('summary', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 5)

    def test_optimization_missing_data(self):
        payload = {
            'config': self.valid_config,
            'data': []
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_optimization_missing_columns(self):
        invalid_data = [{'Wrong_Column': 10}]
        payload = {
            'config': self.valid_config,
            'data': invalid_data
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
