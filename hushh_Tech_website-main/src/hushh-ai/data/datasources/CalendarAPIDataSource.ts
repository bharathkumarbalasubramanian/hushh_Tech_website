/**
 * Calendar API Data Source
 * Client to communicate with deployed Hushh Calendar API
 */

import { logger } from '../../core/utils';

export interface CalendarEvent {
  id: string;
  summary: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  meetLink?: string;
  attendees?: string[];
}

export interface ParseResult {
  intent: 'create_event' | 'list_events' | 'delete_event' | 'update_event';
  confidence: number;
  params: {
    summary?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    attendees?: string[];
    timeMin?: string;
    timeMax?: string;
    eventId?: string;
  };
}

export class CalendarAPIDataSource {
  private apiUrl = 'https://hushh-calendar-api-53407187172.us-central1.run.app/api/v1';
  private apiKey = 'hca_test_cdc3bfada13e3d3cc13c4492ad46194c';

  /**
   * Parse natural language text into calendar intent
   */
  async parseNaturalLanguage(
    text: string,
    userToken: string,
    timezone: string = 'Asia/Kolkata'
  ): Promise<ParseResult> {
    try {
      logger.debug('Parsing calendar intent:', text);

      const response = await fetch(`${this.apiUrl}/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-Token': userToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, timezone }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Calendar API parse error:', error);
        throw new Error(`Failed to parse: ${response.status}`);
      }

      const result = await response.json();
      logger.info('Calendar intent parsed:', result);
      return result;
    } catch (error) {
      logger.error('Error parsing calendar intent:', error);
      throw new Error('Failed to parse calendar intent');
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    eventData: {
      summary: string;
      startTime: string;
      endTime: string;
      description?: string;
      attendees?: string[];
      location?: string;
      createMeet?: boolean;
    },
    userToken: string
  ): Promise<CalendarEvent> {
    try {
      logger.debug('Creating calendar event:', eventData);

      const response = await fetch(`${this.apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-Token': userToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          createMeet: eventData.createMeet !== false, // Default true
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Calendar API create error:', error);
        throw new Error(`Failed to create event: ${response.status}`);
      }

      const event = await response.json();
      logger.info('Calendar event created:', event);
      return event;
    } catch (error) {
      logger.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * List calendar events
   */
  async listEvents(
    params: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
    },
    userToken: string
  ): Promise<CalendarEvent[]> {
    try {
      logger.debug('Listing calendar events:', params);

      const url = new URL(`${this.apiUrl}/events`);
      if (params.timeMin) url.searchParams.append('timeMin', params.timeMin);
      if (params.timeMax) url.searchParams.append('timeMax', params.timeMax);
      if (params.maxResults) url.searchParams.append('maxResults', String(params.maxResults));

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-Token': userToken,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Calendar API list error:', error);
        throw new Error(`Failed to list events: ${response.status}`);
      }

      const result = await response.json();
      logger.info(`Listed ${result.events?.length || 0} calendar events`);
      return result.events || [];
    } catch (error) {
      logger.error('Error listing calendar events:', error);
      throw new Error('Failed to list calendar events');
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string, userToken: string): Promise<void> {
    try {
      logger.debug('Deleting calendar event:', eventId);

      const response = await fetch(`${this.apiUrl}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-Token': userToken,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Calendar API delete error:', error);
        throw new Error(`Failed to delete event: ${response.status}`);
      }

      logger.info('Calendar event deleted:', eventId);
    } catch (error) {
      logger.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }
}

export const calendarAPIDataSource = new CalendarAPIDataSource();
