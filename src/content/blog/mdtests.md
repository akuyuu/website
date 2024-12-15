---
title: 'Testing auto rendering'
description: 'testing the great wall of html tags'
pubDate: 'Nov 11 2024'
---

## header with some text
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean non dolor velit. Donec tellus lectus, ultrices ut ipsum vitae, tristique facilisis risus. Vestibulum gravida blandit ultricies. Etiam magna magna, volutpat scelerisque mollis a, rutrum sit amet mauris. Nunc mattis, turpis eu malesuada suscipit, metus est venenatis metus, sed sollicitudin urna. 

## header with two or more paragraphs
_italic test_ **bold test** ~~through~~ , consectetur adipiscing elit. Nam et magna laoreet, dignissim dui eu, consectetur turpis. Morbi eget arc 

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam et magna laoreet, dignissim dui eu, consectetur turpis. Morbi eget arcu vitae dui lacinia molestie. Etiam et iaculis felis. Maecenas convallis sapien dapibus, vestibulum est et, tincidunt dui. Vestibulum gravida enim lobortis ex egestas pulvinar. Donec pellentesque justo quis tristique placerat.

```go
// taken from https://gobyexample.com/channels
package main

import "fmt"

func main() {

    messages := make(chan string)

    go func() { messages <- "ping" }()

    msg := <-messages
    fmt.Println(msg)
}
```

```json
{
    "glossary": {
        "title": "example glossary",
		"GlossDiv": {
            "title": "S",
			"GlossList": {
                "GlossEntry": {
                    "ID": "SGML",
					"SortAs": "SGML",
					"GlossTerm": "Standard Generalized Markup Language",
					"Acronym": "SGML",
					"Abbrev": "ISO 8879:1986",
					"GlossDef": {
                        "para": "A meta-markup language, used to create markup languages such as DocBook.",
						"GlossSeeAlso": ["GML", "XML"]
                    },
					"GlossSee": "markup"
                }
            }
        }
    }
}
```
* point 1
* point 2
* point 3

imagine conclusion here
