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
        return NextResponse.json(await db.getWorkDaysDb(user.id));
      case 'clients':
        return NextResponse.json(await db.getClientsDb(user.id));
      case 'meetings':
        return NextResponse.json(await db.getMeetingsDb(user.id));
      case 'invoices':
        return NextResponse.json(await db.getInvoicesDb(user.id));
      case 'settings':
        return NextResponse.json(await db.getSettingsDb(user.id));
      case 'templates':
        return NextResponse.json(await db.getTemplatesDb(user.id));
      case 'specialdays':
        return NextResponse.json(await db.getSpecialDaysDb(user.id));
      case 'projects':
        return NextResponse.json(await db.getProjectsDb(user.id));
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
        await db.saveWorkDayDb(user.id, data);
        return NextResponse.json({ success: true });
      case 'deleteWorkDay':
        await db.deleteWorkDayDb(user.id, data.id);
        return NextResponse.json({ success: true });
      case 'saveClient':
        await db.saveClientDb(user.id, data);
        return NextResponse.json({ success: true });
      case 'deleteClient':
        await db.deleteClientDb(user.id, data.id);
        return NextResponse.json({ success: true });
      case 'saveMeeting':
        await db.saveMeetingDb(user.id, data);
        return NextResponse.json({ success: true });
      case 'deleteMeeting':
        await db.deleteMeetingDb(user.id, data.id);
        return NextResponse.json({ success: true });
      case 'saveInvoice':
        await db.saveInvoiceDb(user.id, data);
        return NextResponse.json({ success: true });
      case 'deleteInvoice':
        await db.deleteInvoiceDb(user.id, data.id);
        return NextResponse.json({ success: true });
      case 'saveSettings':
        await db.saveSettingsDb(user.id, data);
        return NextResponse.json({ success: true });
      case 'saveTemplate':
        await db.saveTemplateDb(user.id, data);
        return NextResponse.json({ success: true });
      case 'deleteTemplate':
        await db.deleteTemplateDb(user.id, data.id);
        return NextResponse.json({ success: true });
      case 'saveSpecialDay':
        console.log('[POST] Saving special day:', data);
        await db.saveSpecialDayDb(user.id, data);
        return NextResponse.json({ success: true });
      case 'deleteSpecialDay':
        await db.deleteSpecialDayDb(user.id, data.id);
        return NextResponse.json({ success: true });
      case 'saveProject':
        await db.saveProjectDb(user.id, data);
        return NextResponse.json({ success: true });
      case 'deleteProject':
        await db.deleteProjectDb(user.id, data.id);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Invalid action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('[POST] Error:', error);
    return NextResponse.json({ error: String(error), stack: (error as Error).stack }, { status: 500 });
  }
}
