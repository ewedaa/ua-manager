import { API_BASE_URL } from './api';

const API = API_BASE_URL;

export const fetchClients = async () => {
    const response = await fetch(`${API}/clients/`);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
};

export const fetchTickets = async () => {
    const response = await fetch(`${API}/tickets/`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
};

export const fetchInvoices = async () => {
    const response = await fetch(`${API}/invoices/`);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
};

export const fetchSerials = async () => {
    const response = await fetch(`${API}/genetics-serials/`);
    if (!response.ok) throw new Error('Failed to fetch serials');
    return response.json();
};

export const fetchTodos = async (status = 'all') => {
    const response = await fetch(`${API}/todos/?status=${status}`);
    if (!response.ok) throw new Error('Failed to fetch todos');
    return response.json();
};

export const fetchLivestockTypes = async () => {
    const response = await fetch(`${API}/livestock-types/`);
    if (!response.ok) throw new Error('Failed to fetch livestock types');
    return response.json();
};

export const fetchProjects = async () => {
    const response = await fetch(`${API}/projects/`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
};

export const fetchPayments = async () => {
    const response = await fetch(`${API}/payments/`);
    if (!response.ok) throw new Error('Failed to fetch payments');
    return response.json();
};
