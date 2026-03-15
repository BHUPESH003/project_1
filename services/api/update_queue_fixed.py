import re

path = r"c:\Users\Jogender.Yadav1\projects\internal RnD\project_1\services\api\src\queue\queue.service.ts"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace await this.orderQueue.add to try-catch
text = re.sub(
    r"(await this\.orderQueue\.add\('assign-delivery'[^{]+{[^}]+}\);)",
    r"try {\n      \1\n    } catch (e: any) { this.logger.error(Queue error: ); }",
    text
)

text = re.sub(
    r"(await this\.orderQueue\.add\('order-timeout'[^{]+{[^}]+}\);)",
    r"try {\n      \1\n    } catch (e: any) { this.logger.error(Queue error: ); }",
    text
)

text = re.sub(
    r"(await this\.notificationQueue\.add\('state-change-notification'[^{]+{[^}]+}\);)",
    r"try {\n      \1\n    } catch (e: any) { this.logger.error(Queue error: ); }",
    text
)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Queue service updated with regex.")
