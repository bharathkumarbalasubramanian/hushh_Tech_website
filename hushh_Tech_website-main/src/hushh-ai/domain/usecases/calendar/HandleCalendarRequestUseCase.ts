/**
 * Handle Calendar Request Use Case
 * Processes calendar-related natural language requests
 */
import { CalendarAPIDataSource, CalendarEvent, ParseResult } from '../../../data/datasources/CalendarAPIDataSource';
import { logger } from '../../../core/utils';

export class HandleCalendarRequestUseCase {
  constructor(private calendarDataSource: CalendarAPIDataSource) {}

  /**
   * Process a calendar request from the user
   */
  async execute(
    message: string,
    userToken: string
  ): Promise<{
    response: string;
    calendarEvent?: CalendarEvent;
  }> {
    try {
      // Step 1: Parse the natural language message
      logger.info('Parsing calendar intent:', message);
      const parsed: ParseResult = await this.calendarDataSource.parseNaturalLanguage(
        message,
        userToken
      );

      logger.info('Calendar intent parsed:', parsed);

      // Step 2: Handle based on intent
      switch (parsed.intent) {
        case 'create_event':
          return await this.handleCreateEvent(parsed, userToken);

        case 'list_events':
          return await this.handleListEvents(parsed, userToken);

        case 'delete_event':
          return await this.handleDeleteEvent(parsed, userToken);

        case 'update_event':
          return {
            response: 'Event updates are coming soon! For now, please delete and recreate the event.',
          };

        default:
          return {
            response: `I understood you want to do something with your calendar, but I'm not sure what. Could you rephrase?`,
          };
      }
    } catch (err) {
      logger.error('Error handling calendar request', err as Error);
      return {
        response: 'Sorry, I had trouble processing your calendar request. Please try again or make sure you have granted calendar permissions.',
      };
    }
  }

  private async handleCreateEvent(
    parsed: ParseResult,
    userToken: string
  ): Promise<{ response: string; calendarEvent?: CalendarEvent }> {
    const { summary, startTime, endTime, description, attendees } = parsed.params;

    if (!summary || !startTime || !endTime) {
      return {
        response: 'I need more information to create the event. Please specify the event title, date, and time.',
      };
    }

    try {
      const event = await this.calendarDataSource.createEvent(
        {
          summary,
          startTime,
          endTime,
          description,
          attendees,
          createMeet: true, // Always create Google Meet link
        },
        userToken
      );

      const formattedTime = new Date(event.startTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      return {
        response: `✅ Event created: **${event.summary}** on ${formattedTime}`,
        calendarEvent: event,
      };
    } catch (err) {
      logger.error('Failed to create calendar event', err as Error);
      return {
        response: 'Failed to create the event. Please check your calendar permissions and try again.',
      };
    }
  }

  private async handleListEvents(
    parsed: ParseResult,
    userToken: string
  ): Promise<{ response: string }> {
    const { timeMin, timeMax } = parsed.params;

    try {
      const events = await this.calendarDataSource.listEvents(
        {
          timeMin,
          timeMax,
          maxResults: 10,
        },
        userToken
      );

      if (events.length === 0) {
        return {
          response: 'You have no upcoming events.',
        };
      }

      const eventList = events
        .map((event, index) => {
          const time = new Date(event.startTime).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          return `${index + 1}. **${event.summary}** - ${time}`;
        })
        .join('\n');

      return {
        response: `📅 Your upcoming events:\n\n${eventList}`,
      };
    } catch (err) {
      logger.error('Failed to list calendar events', err as Error);
      return {
        response: 'Failed to retrieve your events. Please check your calendar permissions.',
      };
    }
  }

  private async handleDeleteEvent(
    parsed: ParseResult,
    userToken: string
  ): Promise<{ response: string }> {
    const { eventId } = parsed.params;

    if (!eventId) {
      return {
        response: 'I need the event ID to delete it. Please specify which event to delete.',
      };
    }

    try {
      await this.calendarDataSource.deleteEvent(eventId, userToken);
      return {
        response: `✅ Event deleted successfully.`,
      };
    } catch (err) {
      logger.error('Failed to delete calendar event', err as Error);
      return {
        response: 'Failed to delete the event. Please try again.',
      };
    }
  }
}
