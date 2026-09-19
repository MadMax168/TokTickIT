import { render, screen, waitFor } from '@testing-library/react'
import { vi, test, expect, afterEach } from 'vitest'
import AdminWorkspace from './AdminWorkspace'
afterEach(() => vi.restoreAllMocks())
test('administrator user management lists users and opens create form', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok:true, json:async()=>({items:[{id:1,name:'Admin',email:'admin@example.test',role:'ADMINISTRATOR',active:true}]}) })); render(<AdminWorkspace path="/admin/users" csrfToken="csrf" userId={1}/>); await waitFor(()=>expect(screen.getByText('admin@example.test')).toBeInTheDocument()); screen.getByRole('button',{name:'Create User'}).click(); expect(screen.getByText('Create User')).toBeInTheDocument() })
