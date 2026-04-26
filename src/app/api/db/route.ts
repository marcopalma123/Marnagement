import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  
  console.log('[GET] type:', type);
  
  try {
    switch (type) {
      case 'workdays':
        return NextResponse.json(await db.getWorkDaysDb());
      case 'clients':
        return NextResponse.json(await db.getClientsDb());
      case 'meetings':
        return NextResponse.json(await db.getMeetingsDb());
      case 'invoices':
        return NextResponse.json(await db.getInvoicesDb());
      case 'settings':
        return NextResponse.json(await db.getSettingsDb());
      case 'templates':
        return NextResponse.json(await db.getTemplatesDb());
      case 'specialdays':
        return NextResponse.json(await db.getSpecialDaysDb());
      case 'projects':
        return NextResponse.json(await db.getProjectsDb());
      default:
        return NextResponse.json({ error: 'Invalid type: ' + type }, { status: 400 });
    }
  } catch (error) {
    console.error('[GET] Error:', error);
    return NextResponse.json({ error: String(error), stack: (error as Error).stack }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, data } = body;
    
    console.log('[POST] action:', action, 'data:', JSON.stringify(data).slice(0, 200));
    
    switch (action) {
      case 'saveWorkDay':
        await db.saveWorkDayDb(data);
        return NextResponse.json({ success: true });
      case 'deleteWorkDay':
        await db.deleteWorkDayDb(data.id);
        return NextResponse.json({ success: true });
      case 'saveClient':
        await db.saveClientDb(data);
        return NextResponse.json({ success: true });
      case 'deleteClient':
        await db.deleteClientDb(data.id);
        return NextResponse.json({ success: true });
      case 'saveMeeting':
        await db.saveMeetingDb(data);
        return NextResponse.json({ success: true });
      case 'deleteMeeting':
        await db.deleteMeetingDb(data.id);
        return NextResponse.json({ success: true });
      case 'saveInvoice':
        await db.saveInvoiceDb(data);
        return NextResponse.json({ success: true });
      case 'deleteInvoice':
        await db.deleteInvoiceDb(data.id);
        return NextResponse.json({ success: true });
      case 'saveSettings':
        await db.saveSettingsDb(data);
        return NextResponse.json({ success: true });
      case 'saveTemplate':
        await db.saveTemplateDb(data);
        return NextResponse.json({ success: true });
      case 'deleteTemplate':
        await db.deleteTemplateDb(data.id);
        return NextResponse.json({ success: true });
      case 'saveSpecialDay':
        console.log('[POST] Saving special day:', data);
        await db.saveSpecialDayDb(data);
        return NextResponse.json({ success: true });
      case 'deleteSpecialDay':
        await db.deleteSpecialDayDb(data.id);
        return NextResponse.json({ success: true });
      case 'saveProject':
        await db.saveProjectDb(data);
        return NextResponse.json({ success: true });
      case 'deleteProject':
        await db.deleteProjectDb(data.id);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Invalid action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('[POST] Error:', error);
    return NextResponse.json({ error: String(error), stack: (error as Error).stack }, { status: 500 });
  }
}
