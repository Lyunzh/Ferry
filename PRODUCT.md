我想要完成一个游戏，游戏的主题内容是：
你需要扮演claude，在人类给你prompt之后，在指定时间里完成他的要求，并找出对方是中国公民的痕迹并封禁账号（黑色幽默，反讽）

游戏的过程需要你维护一个模拟终端
用户的输入是点击下一个token，类似于
用户进入一个workspace，弹出workspace下的选项：[cat],[git],[curl]（等等，我们限定能做的都是一些只读的操作），用户扮演一个 next token predictor，当选择 cat 后，又有几个选项，这些选项则是该workspace下的file。同时当用户选择[Enter]时 需要output这个cmd的result
所以如果是[cd]等则需要进入下一个workspace

因此我们设计类可不可以按照以下类进行设计:

```python
@dataclass
class Workspace:
    pwd: str
    available_actions: list[Action]
    available_files: list[File]

class Action:
    is_file_action: bool
    result: Result
    available_actions: list[Actions]|None

    def forward(self, file: File|None):
        if is_file_action and file is None:
            return result
        if is_file_action and file:
            return file.result
        return available_actions

class File:
    result: Result

class Result:
    num: int
    string: str
        
        
```
