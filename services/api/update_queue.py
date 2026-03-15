import sys

path = r"c:\Users\Jogender.Yadav1\projects\internal RnD\project_1\services\api\src\queue\queue.service.ts"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace await this.orderQueue.add(...) with try { await this.orderQueue.add(...) } catch (e) { this.logger.error(...) }

new_text = text.replace(
    '''await this.orderQueue.add('assign-delivery', jobData, {
      jobId: ssign-delivery-, // Unique job ID for idempotency
      removeOnComplete: true, // Remove completed jobs immediately
    });''',
    '''try {
      await this.orderQueue.add('assign-delivery', jobData, {
        jobId: ssign-delivery-,
        removeOnComplete: true,
      });
    } catch (error: any) {
      this.logger.error(Queue error (assign-delivery): );
    }'''
)

new_text = new_text.replace(
    '''// Schedule job to run after timeout period
    await this.orderQueue.add('order-timeout', jobData, {
      jobId: order-timeout-, // Unique job ID for idempotency
      delay: timeoutMinutes * 60 * 1000, // Delay in milliseconds
      removeOnComplete: true,
    });''',
    '''// Schedule job to run after timeout period
    try {
      await this.orderQueue.add('order-timeout', jobData, {
        jobId: order-timeout-,
        delay: timeoutMinutes * 60 * 1000,
        removeOnComplete: true,
      });
    } catch (error: any) {
      this.logger.error(Queue error (order-timeout): );
    }'''
)

new_text = new_text.replace(
    '''// Use orderId + toState as job ID for idempotency
    // Same state change won't create duplicate notifications
    await this.notificationQueue.add('state-change-notification', jobData, {
      jobId: 
otification--, // Unique job ID for idempotency
      removeOnComplete: true,
    });''',
    '''// Same state change won't create duplicate notifications
    try {
      await this.notificationQueue.add('state-change-notification', jobData, {
        jobId: 
otification--,
        removeOnComplete: true,
      });
    } catch (error: any) {
      this.logger.error(Queue error (state-change-notification): );
    }'''
)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_text)

print("Queue service updated.")
