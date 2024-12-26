---  
title: "Reflecting on Go's tags and reflect package"
description: 'actually neat feature'  
pubDate: 'Dec 28 2024'
---

## Intro
If you wrote code in the past in Go and had to work with jsons (or other filetypes for storing data) then you've probably seen code that looks something this:
```go
package main

import (
	"encoding/json"
	"io"
	"net/http"
)

type Resp struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

func GetResp() (*Resp, error) {
	resp, err := http.Get("some.api/v1/endpoint")
	if err != nil {
		return &Resp{}, err
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return &Resp{}, err
	}
	
	var r *Resp
	err = json.Unmarshal(data, &r)
	return r, err
}
```
Here we just make a request, read body and decode it into `Resp` structure, and it just works. After seeing this code you might have following questions: "What are these `json:"id"` and `json:"name"` lines? Why are they even there?". And so I decided to write a bit about these things, what do they do and how you can work with them.
## Really short explanation
These `json:"id"` and  `json:"name"` are called tags. They, essentially, allow you to pass additional information along with that structure's fields (so you can't use them with, for example, interfaces). So in the example above we tell our code that `Resp` struct has these fields with `id` and `name` json keys associated with them. 

"Okay", you might think, "but I think I haven't seen a way to read these tags from the structure directly" and yeah, you can't access them through structure instance itself. However, this is where `reflect` package comes in. Description from the [pkg.go.dev](https://pkg.go.dev/reflect) describes it as follows: "Package reflect implements run-time reflection, allowing a program to manipulate objects with arbitrary types. The typical use is to take a value with static type interface{} and extract its dynamic type information by calling TypeOf, which returns a Type."
 
So, what can we do with it? And will it be of any use in the future?
## Playing with tags and reflect
Imagine that we have the following structure in our code:
```go
type Test struct {
	Field int `some_text`
}
```
If you scan this with gopls (go lsp) it will throw a warning "structtag: struct field tag some_text not compatible with reflect.StructTag.Get: bad syntax for struct tag pair (default)" - ignore it for now :^). So, how does one read this tag? For this we will be using aforementioned `reflect` package:
```go
import (
	"reflect"
)
...
func main() {
	test := Test{1}
	fmt.Println(reflect.TypeOf(t).Field(0).Tag)
}
```
Here's what is happening here: we get a type `reflect.Type` of our variable `test` which in our case will be of type `main.Test`, which makes sense. If, for example, we attempted to call this on variable of type `int`, then we would've gotten `int`, on `string` - `string` and so on. Then, since we know that test is of type `Test`, we can attempt to access first field by calling `Field(n)` method, where `n` is the index of the field in the structure, starting with 0. This returns `reflect.StructField` which we will work with later, but keep it in mind. Note that code will panic if you attempt to call `Field()` on a variable that is not a struct or if index is out of range.

Now that we have our struct field, and we know that it is valid we can obtain its tag by getting `Tag` attribute which will give us `some_text`, which is an expected behavior. But we are getting a warning and that something is missing, and what would you do with this tag anyway? And what if you want to add more tags to the same field and structure them? Which is why let us rewrite our struct a bit:
```go
type Test struct {
	ID int `ref:"field1"`
	Name string `ref:"field2"`
}
// assume respective changes to the test variable in the main function
// test := Test{1, "Ame"}
```
Now we have introduced keys and values in our tags. If we wanted our fields to have more than one key-value pair then it would've looked like this: `key1:"val1" key2:"val2"`, so we separate tags using spaces, but for now we will work with one key only. Now that we have a key, we can obtain an associated value by doing the following
```go
reflect.TypeOf(t).Field(0).Tag.Get("ref")
//field1

reflect.TypeOf(t).Field(1).Tag.Get("ref")
//field2

fmt.Println(reflect.TypeOf(t).Field(0).Tag.Get("notref"))
// <we get empty string here!>
```
So it is fairly easy to get keys our struct tags, and checking if key is there by comparing value with empty string is also possible. Now that we know how we can get tags, we can go deeper by working more with reflect package and coming up with a use case for that.
## «Real» use case
Imagine the following situation: we are writing a lazy wrapper for some cli tool (for example [yt-dlp](https://github.com/yt-dlp/yt-dlp)) and we want to have parameters to be passed to it, but they are, naturally, are passed using flags (tbh in yt-dlp's case there might be a way to do that using json config of sorts, but imagine that we can only use flags). Assume that this is our struct of parameters that we want to pass to the yt-dlp:
```go
type YTdlp struct {
	NoProgress   bool
	NoOverwrites bool
	ExtractAudio bool

	DefaultSearch string
	Format        string
	FileType      string
	Quality       string
}
```

You could hardcode all fields and manually set output flags:
```go
func toArgs(y YTdlp) []string{
	out := make([]string, 0, 7)
	if y.NoProgress {
		out = append(out, "--no-progress")
	}
	if y.NoOverwrites {
		out = append(out, "--no-overwrites")
	}
	if y.ExtractAudio {
		out = append(out, "-x")
	}

	if y.DefaultSearch != "" {
		out = append(out, "--default-search")
		out = append(out, y.DefaultSearch)
	}
	// assume that we repeat this with Format, FileType, Quality

	return out
}
```
This approach works, but:
* What if we get more parameters as we write more code? You'd have to hardcode them too
* Why would you have these flags located somewhere in depths of your code and not near to the structure? If someone were to read/debug your code they'd have to read source in 2 places at the same time
* Typing all that is tiring, no one wants to do that (and even I skipped 3 flags while writing this)
* Function already looks bad and it would grow in the future if we were to add something to it, or, if we decided that some flags can be grouped by a rule and thus require custom processing

So, can we do better? And yeah, we can try using `reflect` package along with tags here instead! Lets modify our structure to include flags in our tags and let them be accessible by `cmd` key:
```go
type YTdlp struct {
	NoProgress   bool `cmd:"--no-progress"`
	NoOverwrites bool `cmd:"--no-overwrites"`
	ExtractAudio bool `cmd:"-x"`

	DefaultSearch string `cmd:"--default-search"`
	Format        string `cmd:"--format"`
	FileType      string `cmd:"--audio-format"`
	Quality       string `cmd:"--audio-quality"`
}
```

As you can see, it is already better than previous approach - we can clearly see which flags are associated with our fields right in the struct definition instead of looking for them who-knows-where. In this case we want that bool flags are going to be included only if respective field is set to `true`, and other fields are just going to be included anyway but with value of that field. So, how can we achieve this?

Since we have these flags as arguments, then it would make sense if our function signature had `[]string` as output, so let us have a method `toArgs() []string` on `YTdlp` struct. The output slice's structure is going to be an interleaved sequence of flags and arguments (or just a flag if its boolean). We want all fields, so we have to iterate over them, and natural thought chain would be: "I know that I can get a field by its index -> It panics when I get out of range -> I have to get last index somehow" and that is simple enough:
```go
func (y *YTdlp) toArgs() []string{
	v := reflect.ValueOf(*y)
	out := make([]string, 0, v.NumField())
	for i := 0; i < v.NumField(); i++ {
		out[i] = fmt.Sprintf("%d", i)
	}
	return out
}
```

Here we get values of our struct `YTdlp` and then get number of these values using `NumField()` to limit our iterations. We also create an output, which for now just contains indices as strings. Now that we can iterate we need a way to differentiate between field types, i.e. how do we know that field is a string or a bool?

First, we can obtain a related flag like this: 
```go
cmdstr := reflect.TypeOf(*y).Field(i).Tag.Get("cmd")
```

`reflect.StructField` (the one that we can obtain by `Field()` method) has fields and methods other than `Tag` but in our case we only care about one that would provide us with its type:
```go
reflect.TypeOf(*y).Field(i).Type.Kind()
// returns reflect.Kind
```

One of the ways to approach this would be converting to string and comparing with `string`, `bool` and so on, but we can do better. Since it does not return a string, then there must be a reason why they return a custom type, right? `reflect` provides us with convenient `reflect.Bool`, `reflect.String`, `reflect.Int` and so on for comparing types just like that. So, we wrap this in a switch statement:
```go
switch reflect.TypeOf(*y).Field(i).Type.Kind() {
	case reflect.Bool:
		if fmt.Sprintf("%v", v.Field(i)) == "true" {
			out = append(out, cmdstr)
		}

	case reflect.String:
		if cmdstr == ""{
			continue
		}
		out = append(out, cmdstr)
		out = append(out, fmt.Sprintf("\"%v\"", v.Field(i)))

	default:
		continue
	}
```

And now we have finished writing our function that converts structure with cmd flags to the respective list of arguments:
```go
func (y *YTdlp) toArgs() []string {
	v := reflect.ValueOf(*y)
	out := make([]string, 0, v.NumField())
	
	for i := 0; i < v.NumField(); i++ {
		cmdstr := reflect.TypeOf(*y).Field(i).Tag.Get("cmd")
		
		switch reflect.TypeOf(*y).Field(i).Type.Kind() {
		case reflect.Bool:
			if fmt.Sprintf("%v", v.Field(i)) == "true" {
				out = append(out, cmdstr)
			}

		case reflect.String:
			if cmdstr == ""{
				continue
			}
			
			out = append(out, cmdstr)
			out = append(out, fmt.Sprintf("\"%v\"", v.Field(i)))

		default:
			continue
		}
	}
	return out
}
```

After this you can plug its output into `os/exec` command as an argument and it should work just fine. So, as you can see, we converted our structure into slice of flags & arguments without hardcoding. Now, lets imagine a separate case, where struct has fields which are integers and more importantly, maps. We want to iterate over these maps, get keys and values and concatenate them - what would our case for `reflect.Map` look like then?
## Further reflecting
Once again, imagine that we have to convert a structure into list of command line arguments for some tool:
```go
type ArgStruct struct {
	Recursive bool              `cmd:"--rec"`
	Mode      string            `cmd:"--mode"`
	Offset    int               `cmd:"--offset"`
	Params    map[string]string `cmd:"--params"`
}
```

We already know how to work with `reflect.Bool`, `reflect.String` and `reflect.Int`, but what do we do with `reflect.Map`? We are aiming for dynamic conversion, that is, we don't want to hardcode fields' access and iterate over that map as you would usually do - imagine that we get more maps as we write more code. Lets change function that we wrote above a bit:
```go
func (a *ArgStruct) toArgs() []string {
	v := reflect.ValueOf(*a)
	out := make([]string, 0, v.NumField())
	
	for i := 0; i < v.NumField(); i++ {
		cmdstr := reflect.TypeOf(*a).Field(i).Tag.Get("cmd")
		
		switch reflect.TypeOf(*a).Field(i).Type.Kind() {
		case reflect.Bool:
			if fmt.Sprintf("%v", v.Field(i)) == "true" {
				out = append(out, cmdstr)
			}

		case reflect.String, reflect.Int:
			if cmdstr == "" {
				continue
			}
			
			out = append(out, cmdstr)
			out = append(out, fmt.Sprintf("\"%v\"", v.Field(i)))

		case reflect.Map:
			continue	
			
		default:
			continue
		}
	}
	return out
}
```

Now, lets look into what we can do with our map. For our purposes it is sufficient to use `MapRange()` method that returns a map iterator:
```go
iter := v.Field(i).MapRange()
for iter.Next(){
	// key: iter.Key()
	// value: iter.Value()
}
```
So, assume that we want our map entries to be separated by spaces and k-v pairs to be concatenated with colons:
```go
case reflect.Map:
	// note: not sure if its ok to concat strings with + and not joining with strings pkg instead
	// so we ignore trailing space on the right
	tmp := ""
	iter := v.Field(i).MapRange()
	for iter.Next(){
		tmp += fmt.Sprintf("%s:%s ", iter.Key(), iter.Value())
	}
	
	out = append(out, cmdstr)
	out = append(out, tmp)
```

And so, if you plug this case statement into the function defined above and run on following structure it will output the following:
```go
func main(){
	var args ArgStruct = ArgStruct{
		Recursive: true,
		Mode:      "dev",
		Offset:    5,
		Params: map[string]string{
			"key1": "val1",
			"key2": "val2",
			"key3": "val3",
		},
	}
	
	args.toArgs()
}
// [--rec --mode "dev" --offset "5" --params key3:val3 key1:val1 key2:val2 ]
```

And sure enough, it works as expected: boolean flags are included as just flags, string and integer flags have both flag and value, map flags have flag and concatenated key-value pairs. You could also introduce branching to this - for example do something differently if value equals something, but that, too, can be controlled with tags (for example `map:"maptype"` and then one more switch, which is might look bad will get the job done)
## Outro
I think that tags are a nice feature which can find many applications in applicable situation and `reflect` package allows you to do many indirect manipulations with your variables if you only know their type. Maybe I should've talked more about `reflect` itself because I am certain it has more applications, but I decided to focus on tags and how you can work with them, so maybe ill write more about `reflect` in the future. You might also be disappointed that I did not go into details how this works under the hood i.e. how Go processes tags along with structs, but I did not think that would be required here. All code was written by me (that yt-dlp part was taken directly from one of my repos, hence "real" in the header). Text, too, was written by me because I like writing things myself.