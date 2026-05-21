import { prisma } from '@/lib/db';
import { createZoomMeeting } from '@/lib/zoom';
import { sendPaymentConfirmedEmail, sendMeetingCreatedEmail } from '@/lib/email';

/**
 * Performs post-payment actions for a booking:
 * 1. Creates a Zoom meeting
 * 2. Initializes a chat conversation
 * 3. Sends confirmation emails to both parties
 */
export async function processConfirmedBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      employee: {
        select: {
          id: true,
          email: true,
          employeeProfile: { select: { fullName: true } },
        },
      },
      student: {
        select: {
          id: true,
          email: true,
          studentProfile: { select: { fullName: true } },
        },
      },
      parent: {
        select: {
          id: true,
          email: true,
          parentProfile: { select: { fullName: true } },
        },
      },
    },
  });

  if (!booking) throw new Error('Booking not found');

  let meetingLink = booking.meetingLink;
  let conversationId = booking.conversationId;

  // 1. Create Zoom meeting if not exists
  if (!meetingLink) {
    try {
      const employeeEmail = booking.employee.email;
      if (!employeeEmail) throw new Error('Employee email missing');

      const meeting = await createZoomMeeting({
        userId: employeeEmail,
        scheduledAt: booking.scheduledAt,
        durationMins: booking.durationMins,
        topic: booking.topic || 'Career counseling session',
        agenda: `Career counseling for ${
          booking.student?.studentProfile?.fullName ||
          booking.parent?.parentProfile?.fullName ||
          ''
        }`,
      });

      meetingLink = meeting.join_url;

      await prisma.booking.update({
        where: { id: bookingId },
        data: { meetingLink },
      });
    } catch (error) {
      console.error('Failed to create Zoom meeting:', error);
    }
  }

  // 2. Create conversation if not exists
  if (!conversationId) {
    try {
      const conversationType = booking.studentId
        ? 'STUDENT_EMPLOYEE'
        : booking.parentId
        ? 'PARENT_EMPLOYEE'
        : null;

      if (conversationType) {
        const conversation = await prisma.conversation.create({
          data: {
            type: conversationType,
            participants: {
              create: [
                { userId: booking.employeeId },
                { userId: (booking.studentId || booking.parentId) as string },
              ],
            },
          },
        });

        conversationId = conversation.id;
        await prisma.booking.update({
          where: { id: bookingId },
          data: { conversationId },
        });
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }

  // 3. Send emails
  try {
    const employeeEmail = booking.employee.email;
    const studentEmail = booking.student?.email;
    const parentEmail = booking.parent?.email;
    const customerEmail = studentEmail || parentEmail;

    const employeeName = booking.employee.employeeProfile?.fullName || 'Mentor';
    const studentName =
      booking.student?.studentProfile?.fullName ||
      booking.parent?.parentProfile?.fullName ||
      'Student';

    if (employeeEmail) {
      await sendPaymentConfirmedEmail({
        to: employeeEmail,
        employeeName,
        scheduledAt: booking.scheduledAt,
        bookingTopic: booking.topic || 'Career counseling session',
        meetingLink: meetingLink || '',
      });
    }

    if (customerEmail) {
      await sendMeetingCreatedEmail({
        to: customerEmail,
        studentName,
        scheduledAt: booking.scheduledAt,
        meetingLink: meetingLink || '',
      });
    }
  } catch (error) {
    console.error('Failed to send emails:', error);
  }

  return { meetingLink, conversationId };
}
