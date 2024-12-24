import os

def failure_alert(context):
    project_name = os.environ.get("PROJECT_NAME")
    task_instance_key_str = context['task_instance_key_str']
    message = "\n"
    message += f"Project: `{project_name}` \n"
    message += f"Instance: `{task_instance_key_str}` \n"
    message += f"Date: {context['logical_date']}\n"
    message += f"🔍 注意！出事啦！娘子快跟牛魔王出來看上帝！ \n"

    print(f"Task has failed, task_instance_key_str: {task_instance_key_str}")
    print(context)

    return