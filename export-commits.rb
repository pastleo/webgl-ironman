#!/usr/bin/env ruby

Dir.chdir File.expand_path(File.dirname(__FILE__))

commits = `git log --pretty=format:"%H"`.strip.split("\n")

`rm -rf commits`
print "exporting #{commits.count} commits"
commits.each do |c|
  `mkdir -p commits/#{c}`
  ok = system "git archive #{c} | tar -x -C commits/#{c}"
  if ok
    print "."
  else
    raise "git returned non-zero code"
  end
end

puts "Done"
